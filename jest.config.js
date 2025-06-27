export default {
	preset:              'ts-jest/presets/js-with-ts-esm',
	globals:             {
		extensionsToTreatAsEsm:['.ts', '.js', '.mjs', '.mjsx'],
	},
	transform:           {
		'^.+\\.[tj]sx?$|^.+\\.mjsx?$':['ts-jest', {useESM:true}],
	},
	moduleFileExtensions:['ts', 'tsx', 'js', 'jsx', 'mjs', 'mjsx', 'json', 'node'],
};
