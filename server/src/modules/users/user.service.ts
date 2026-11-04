import bcrypt from 'bcrypt';
import { FilterQuery, Types } from 'mongoose';
import { User, IUserDocument } from './user.model.js';
import { Team } from '../teams/team.model.js';
import { AuthService } from '../auth/auth.service.js';
import { BadRequestError, ConflictError, NotFoundError, ForbiddenError } from '../../shared/errors/AppError.js';
import { AuthUserPayload } from '../../shared/types/index.js';
import { USER_ROLES, UserRole } from '../../config/constants.js';

export class UserService {
  static async listUsers(query: {
    page?: number;
    limit?: number;
    role?: UserRole;
    teamId?: string;
    isActive?: boolean;
    search?: string;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: FilterQuery<IUserDocument> = {};

    if (query.role) filter.role = query.role;
    if (query.teamId) filter.teamId = new Types.ObjectId(query.teamId);
    if (query.isActive !== undefined) filter.isActive = query.isActive;
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .populate('teamId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getUserById(userId: string) {
    const user = await User.findById(userId).populate('teamId', 'name description').lean();
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  static async createUser(data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    teamId?: string;
  }) {
    const existing = await User.findOne({ email: data.email });
    if (existing) {
      throw new ConflictError('A user with this email address already exists');
    }

    let teamObjectId: Types.ObjectId | null = null;
    if (data.teamId) {
      const team = await Team.findById(data.teamId);
      if (!team) {
        throw new BadRequestError('Specified team does not exist');
      }
      teamObjectId = team._id;

      if (data.role === USER_ROLES.MANAGER) {
        if (team.managerId) {
          throw new BadRequestError('Specified team already has an assigned Manager');
        }
      }
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await User.create({
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      teamId: teamObjectId,
      isActive: true,
    });

    // If user is a manager, link team.managerId
    if (data.role === USER_ROLES.MANAGER && teamObjectId) {
      await Team.findByIdAndUpdate(teamObjectId, { managerId: user._id });
    }

    return user;
  }

  static async updateUser(
    userId: string,
    data: {
      name?: string;
      email?: string;
      role?: UserRole;
      teamId?: string | null;
    },
    actor?: AuthUserPayload
  ) {
    if (data.role && actor && (actor._id?.toString() === userId || (actor as { id?: string }).id === userId)) {
      throw new ForbiddenError('Users cannot change their own role');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (data.email && data.email !== user.email) {
      const existing = await User.findOne({ email: data.email });
      if (existing) {
        throw new ConflictError('A user with this email address already exists');
      }
      user.email = data.email;
    }

    if (data.name) user.name = data.name;

    if (data.role && data.role !== user.role) {
      if (user.role === USER_ROLES.MANAGER && data.role !== USER_ROLES.MANAGER) {
        await Team.updateMany({ managerId: user._id }, { $unset: { managerId: 1 } });
      }
      user.role = data.role;
      if (data.role === USER_ROLES.ADMIN) {
        user.teamId = undefined;
      }
    }

    if (data.teamId !== undefined) {
      if (data.teamId === null || data.role === USER_ROLES.ADMIN) {
        if (user.role === USER_ROLES.MANAGER && user.teamId) {
          await Team.findByIdAndUpdate(user.teamId, { $unset: { managerId: 1 } });
        }
        user.teamId = undefined;
      } else {
        const team = await Team.findById(data.teamId);
        if (!team) {
          throw new BadRequestError('Specified team does not exist');
        }
        user.teamId = team._id;
        if (user.role === USER_ROLES.MANAGER) {
          await Team.findByIdAndUpdate(team._id, { managerId: user._id });
        }
      }
    }

    await user.save();
    return user;
  }

  static async updateUserStatus(userId: string, isActive: boolean) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    user.isActive = isActive;
    await user.save();

    if (!isActive) {
      // Immediately revoke all sessions
      await AuthService.revokeAllUserSessions(userId);
    }

    return user;
  }
}
