# ===
# This is the main GYP file, which builds better-sqlcipher.
# ===

{
  'includes': ['deps/common.gypi'],
  'targets': [
    {
      'target_name': 'better_sqlcipher',
      'dependencies': ['deps/sqlcipher.gyp:sqlcipher'],
      'sources': ['src/better_sqlite3.cpp'],
      'cflags_cc': ['-std=c++17'],
      'xcode_settings': {
        'OTHER_CPLUSPLUSFLAGS': ['-std=c++17', '-stdlib=libc++'],
      },
      'msvs_settings': {
        'VCCLCompilerTool': {
          'AdditionalOptions': [
            '/std:c++17',
          ],
        },
      },
      'conditions': [
        ['OS=="linux"', {
          'ldflags': [
            '-Wl,-Bsymbolic',
            '-Wl,--exclude-libs,ALL',
          ],
        }],
      ],
    },
    {
      'target_name': 'test_extension',
      'dependencies': ['deps/sqlcipher.gyp:sqlcipher'],
      'sources': ['deps/test_extension.c'],
    },
  ],
}
