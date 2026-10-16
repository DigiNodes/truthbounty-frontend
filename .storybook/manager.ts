import { addons } from 'storybook/manager-api';
import { themes } from 'storybook/theming';

addons.setConfig({
  theme: {
    ...themes.light,
    brandTitle: 'TruthBounty · Gate C UI',
    brandUrl: 'https://github.com/DigiNodes/truthbounty-protocol/tree/main/docs/ux-authority',
  },
});
