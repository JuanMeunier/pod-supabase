import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  /**
   * POST /users - Crea o actualiza un usuario
   * Usa un objeto del usuario autenticado (desde Supabase Auth)
   * Se invoca automáticamente tras login, pero también disponible manualmente
   */
  @Post()
  async upsertFromAuth(@Body() authUser: any) {
    return this.usersService.upsertFromAuth(authUser);
  }

  /**
   * GET /users/:user_id - Obtiene los datos de un usuario
   */
  @Get(':user_id')
  async findOne(@Param('user_id') user_id: string) {
    return this.usersService.findByUserId(user_id);
  }

  /**
   * PATCH /users/:user_id/role - Cambia el role de un usuario
   * Ejemplo: { "role": "stakeholder" }
   * Roles disponibles: 'free', 'community', 'stakeholder', 'admin'
   */
  @Patch(':user_id/role')
  async updateRole(@Param('user_id') user_id: string, @Body() body: { role: string }) {
    return this.usersService.updateRole(user_id, body.role);
  }
}
