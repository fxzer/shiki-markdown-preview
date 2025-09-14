/**
 * ESLint configuration for the project.
 * 
 * See https://eslint.style and https://typescript-eslint.io for additional linting options.
 */
// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';

export default tseslint.config(
	{
		ignores: [
			'out',
			'media',
			'shiki-markdown-preview-0.0.1',
		],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	...tseslint.configs.stylistic,
	{
		languageOptions: {
			globals: {
				console: 'readonly',
				document: 'readonly',
				window: 'readonly',
				setInterval: 'readonly',
				clearInterval: 'readonly',
				setTimeout: 'readonly',
				clearTimeout: 'readonly',
				exports: 'readonly',
				require: 'readonly',
				acquireVsCodeApi: 'readonly'
			}
		},
		plugins: {
			'@stylistic': stylistic,
		},
		rules: {
			'curly': 'warn',
			'@stylistic/semi': ['warn', 'always'],
			'@typescript-eslint/no-empty-function': 'off',
			'@typescript-eslint/naming-convention': [
				'warn',
				{
					'selector': 'import',
					'format': ['camelCase', 'PascalCase']
				}
			],
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					'argsIgnorePattern': '^_'
				}
			],
			'@typescript-eslint/no-explicit-any': 'warn'
		}
	}
);
