import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
// 💡 Passing an array makes it an "OR" check.
// It tries 'jwt-bearer' first. If missing, it tries 'jwt-cookie'.
export class UniversalAuthGuard extends AuthGuard([
  'jwt-bearer',
  'jwt-cookie',
]) {}
