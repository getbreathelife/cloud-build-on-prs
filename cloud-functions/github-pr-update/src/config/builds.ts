import { Build } from '../builds';

const MANIFEST_PATH = 'cloud-build-on-prs/manifests';

export const builds: Build[] = [
    {
        id: '1a',
        label: 'Build and test Product 1 - Partner A',
        manifestFile: `${MANIFEST_PATH}/cloudbuild-1a.yaml`,
        projectPaths: ['product1/partnerA', 'product1/shared', 'shared'],
    },
    {
        id: '1b',
        label: 'Build and test Product 1 - Partner B',
        manifestFile: `${MANIFEST_PATH}/cloudbuild-1b.yaml`,
        projectPaths: ['product1/partnerB', 'product1/shared', 'shared'],
    },
    {
        id: '2c',
        label: 'Build and test Product 2 - Partner C',
        manifestFile: `${MANIFEST_PATH}/cloudbuild-2c.yaml`,
        projectPaths: ['product2/partnerC', 'product2/shared', 'shared'],
    },
    {
        id: '2d',
        label: 'Build and test Product 2 - Partner D',
        manifestFile: `${MANIFEST_PATH}/cloudbuild-2d.yaml`,
        projectPaths: ['product2/partnerD', 'product2/shared', 'shared'],
    },
];
