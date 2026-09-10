import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/coverage/**',
      '**/generated/**',
      '**/*.spec.ts',
      '**/*.test.ts',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn'],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['**/components/atoms/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app/components/ui/*'],
              message:
                'Import from atoms or molecules instead of components/ui directly.',
            },
          ],
        },
      ],
    },
  },
);
