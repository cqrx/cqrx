import { RegisterUserHandler } from './handler/register-user.handler';

export const COMMAND_HANDLERS = [RegisterUserHandler];
export { RegisterUser } from './impl/register-user.command';
