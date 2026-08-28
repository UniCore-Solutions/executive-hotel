import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: '../backend-hotel/src/main/resources/graphql/**/*.graphqls',
  documents: ['src/graphql/**/*.graphql'],
  generates: {
    'src/graphql/generated/': {
      preset: 'client',
      presetConfig: {
        // Fragments are reuse helpers for the shared selections; the
        // services map the raw result types, so keep fields inlined instead
        // of behind the $fragmentRefs masking indirection.
        fragmentMasking: false,
      },
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