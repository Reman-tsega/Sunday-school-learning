import { Request, Response } from 'express';
import { studentService } from '../services/student.service.js';

export async function listStudents(req: Request, res: Response): Promise<void> {
  const { churchParish, gradeId, search, page, limit } = req.query;

  const result = await studentService.listStudents({
    churchParish: churchParish ? String(churchParish) : undefined,
    gradeId: gradeId ? String(gradeId) : undefined,
    search: search ? String(search) : undefined,
    page: page ? parseInt(String(page), 10) : undefined,
    limit: limit ? parseInt(String(limit), 10) : undefined,
  });

  res.status(200).json(result);
}

export async function getSundaySchools(_req: Request, res: Response): Promise<void> {
  const list = await studentService.getSundaySchoolsList();
  res.status(200).json({ sundaySchools: list });
}

export async function getStudentProgress(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const result = await studentService.getStudentProgressDetails(id);
  res.status(200).json(result);
}
