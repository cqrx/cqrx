import { Injectable } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';

import { EVENT_STORE_TRANSFORMERS_TOKEN } from './contract/constant';
import { TransformerRepo } from './interfaces';

@Injectable()
export class TransformerService {
  constructor(private readonly modules: ModulesContainer) {
    const transformers = [...this.modules.values()]
      .flatMap((nestModule) => [...nestModule.providers.values()])
      .filter(({ name }) => name === EVENT_STORE_TRANSFORMERS_TOKEN)
      .flatMap(({ instance }) => Object.entries(instance as TransformerRepo));

    this.repo = Object.fromEntries(transformers);
  }

  public readonly repo: TransformerRepo;
}
