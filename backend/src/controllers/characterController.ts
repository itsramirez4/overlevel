import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { characterService } from '../services/characterService';

export class CharacterController {
  async types(req: AuthRequest, res: Response) {
    res.json(characterService.getTypes());
  }

  async getMine(req: AuthRequest, res: Response) {
    const character = await characterService.getMyCharacter(req.userId!);
    res.json(character);
  }

  async create(req: AuthRequest, res: Response) {
    const character = await characterService.create(req.userId!, req.body.character_type);
    res.status(201).json(character);
  }
}

export const characterController = new CharacterController();
