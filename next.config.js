
const config = {
  poweredByHeader: false,
  webpack5: true,
  async redirects () {
    return [
      {
        source: '/',
        destination: '/demo',
        permanent: false
      },
      {
        source: '/:domain/settings',
        destination: '/:domain/settings/account',
        permanent: true
      }
    ];
  },
  webpack (_config, { isServer }) {
    _config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack']
    });
    return _config;
  }
};

/**
 * Remove undefined values so Next.js doesn't complain during serialization
 */
const removeUndefined = obj => {
  const newObj = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] === Object(obj[key])) newObj[key] = removeUndefined(obj[key]);
    else if (obj[key] !== undefined) newObj[key] = obj[key];
  });
  return newObj;
};
const next = require('next/dist/lib/is-serializable-props');
// eslint-disable-next-line prefer-destructuring
const isSerializableProps = next.isSerializableProps;
next.isSerializableProps = function _isSerializableProps (page, method, input) {
  return isSerializableProps(page, method, removeUndefined(input));
};

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true'
});

// fix for esm modules
const withTM = require('next-transpile-modules')([
  '@bangle.dev/base-components',
  '@bangle.dev/core',
  '@bangle.dev/pm',
  '@bangle.dev/react',
  '@bangle.dev/utils',
  '@bangle.dev/markdown',
  '@bangle.dev/tooltip',
  '@bangle.dev/react-menu',
  '@bangle.dev/emoji',
  '@bangle.dev/react-emoji-suggest',
  '@bangle.dev/table',
  '@popperjs/core'
]);

module.exports = withBundleAnalyzer(withTM(config));
