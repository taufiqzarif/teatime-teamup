import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReactConfig from "eslint-plugin-react/configs/recommended.js";
import { fixupConfigRules } from "@eslint/compat";


export default [
  {languageOptions: { globals: globals.node }},
  pluginJs.configs.recommended,
  ...fixupConfigRules(pluginReactConfig),
  { rules: { 'no-unused-vars': 'warn' } },
];