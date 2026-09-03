import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { userService } from '../services/userService';
import { importService } from '../services/importService';
import { followService } from '../services/followService';
import { workoutService } from '../services/workoutService';
import { characterService } from '../services/characterService';
import { parsePositiveIntParam } from '../utils/queryParams';
import { isAdmin } from '../utils/admin';

export class UserController {
  async me(req: AuthRequest, res: Response) {
    const user = await userService.getUserById(req.userId!);
    // Computed, not stored — see utils/admin.ts. Frontend uses this to
    // decide whether to show moderation controls, but every actual
    // permission check happens server-side regardless of what this says.
    res.json({ ...user, is_admin: isAdmin(req.userId!) });
  }

  async update(req: AuthRequest, res: Response) {
    const user = await userService.updateUser(req.userId!, req.body);
    res.json(user);
  }

  async bodyWeightHistory(req: AuthRequest, res: Response) {
    const days = parsePositiveIntParam(req.query.days, 90);
    const history = await userService.getBodyWeightHistory(req.userId!, days);
    res.json(history);
  }

  async changePassword(req: AuthRequest, res: Response) {
    await userService.changePassword(req.userId!, req.body.current_password, req.body.new_password);
    res.status(204).send();
  }

  async exportData(req: AuthRequest, res: Response) {
    const data = await userService.exportData(req.userId!);
    res.json(data);
  }

  async feed(req: AuthRequest, res: Response) {
    const workouts = await workoutService.getFeed(req.userId!);
    res.json(workouts);
  }

  async importHevy(req: AuthRequest, res: Response) {
    const result = await importService.importHevyCsv(req.userId!, req.body.csv);
    res.json(result);
  }

  async search(req: AuthRequest, res: Response) {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!query) return res.json([]);
    const results = await userService.search(query, req.userId!);
    res.json(results);
  }

  async publicProfile(req: AuthRequest, res: Response) {
    const profile = await userService.getPublicProfile(req.params.id, req.userId!);
    res.json(profile);
  }

  async publicWorkouts(req: AuthRequest, res: Response) {
    const workouts = await workoutService.listPublic(req.params.id, req.userId!);
    res.json(workouts);
  }

  async publicWorkoutDetail(req: AuthRequest, res: Response) {
    const workout = await workoutService.getPublicById(req.params.workoutId, req.params.id, req.userId!);
    res.json(workout);
  }

  async publicCharacter(req: AuthRequest, res: Response) {
    const character = await characterService.getPublicCharacter(req.params.id, req.userId!);
    res.json(character);
  }

  async follow(req: AuthRequest, res: Response) {
    await followService.follow(req.userId!, req.params.id);
    res.status(204).send();
  }

  async unfollow(req: AuthRequest, res: Response) {
    await followService.unfollow(req.userId!, req.params.id);
    res.status(204).send();
  }

  async followers(req: AuthRequest, res: Response) {
    await userService.assertViewable(req.params.id, req.userId!);
    res.json(await followService.listFollowers(req.params.id));
  }

  async following(req: AuthRequest, res: Response) {
    await userService.assertViewable(req.params.id, req.userId!);
    res.json(await followService.listFollowing(req.params.id));
  }
}

export const userController = new UserController();
