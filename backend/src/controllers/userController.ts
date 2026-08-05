import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { userService } from '../services/userService';

export class UserController {
  async me(req: AuthRequest, res: Response) {
    const user = await userService.getUserById(req.userId!);
    res.json(user);
  }

  async update(req: AuthRequest, res: Response) {
    const user = await userService.updateUser(req.userId!, req.body);
    res.json(user);
  }

  async bodyWeightHistory(req: AuthRequest, res: Response) {
    const days = req.query.days ? parseInt(req.query.days as string) : 90;
    const history = await userService.getBodyWeightHistory(req.userId!, days);
    res.json(history);
  }

  async changePassword(req: AuthRequest, res: Response) {
    await userService.changePassword(req.userId!, req.body.current_password, req.body.new_password);
    res.status(204).send();
  }
}

export const userController = new UserController();
