// SPDX-License-Identifier: GPL-2.0-or-later
import js from '@eslint/js';
import globals from 'globals';

export default [
    js.configs.recommended,
    {
        files: ['src/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.es2021,
                // GJS와 GNOME Shell이 확장에 제공하는 전역입니다.
                console: 'readonly',
                global: 'readonly',
                imports: 'readonly',
                log: 'readonly',
                logError: 'readonly',
                print: 'readonly',
                printerr: 'readonly',
            },
        },
    },
    {
        files: ['tests/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: globals.node,
        },
    },
];
