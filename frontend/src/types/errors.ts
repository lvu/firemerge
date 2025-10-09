import type { PydanticErrorResponse } from './backend';

export class PydanticError extends Error {
  data: PydanticErrorResponse;

  constructor(data: PydanticErrorResponse) {
    super(data.detail[0].msg);
    this.name = 'PydanticError';
    this.data = data;
  }
}
