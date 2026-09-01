import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: '../backend-hotel/src/main/resources/graphql/**/*.graphqls',
  documents: ['src/graphql/**/*.graphql'],
  generates: {
    'src/graphql/generated/': {
      preset: 'client',
      config: {
        scalars: {
          DateTime: 'string',
          LocalDate: 'string',
        },
      },
    },
  },
  hooks: { afterAllFileWrite: ['prettier --write'] },
};

export default config;
