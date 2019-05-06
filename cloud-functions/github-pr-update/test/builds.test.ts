import { Build, filterBuildsWithChangedFiles } from '../src/builds';

const PROJECT_PATHS = {
  Project1: 'project1',
  Project2: 'project2',
  Project3: 'project3',
  Project4: 'project4',
};

const builds: Build[] = [
  {
    id: 'build1',
    label: 'Project1 and Project2',
    manifestFile: '',
    projectPaths: [PROJECT_PATHS.Project1, PROJECT_PATHS.Project2],
  },
  {
    id: 'build2',
    label: 'Project3 and Project4',
    manifestFile: '',
    projectPaths: [PROJECT_PATHS.Project3, PROJECT_PATHS.Project4],
  },
  {
    id: 'build3',
    label: 'Project2 and Project4',
    manifestFile: '',
    projectPaths: [PROJECT_PATHS.Project2, PROJECT_PATHS.Project4],
  },
];

describe('Detect necessary builds based on changed file paths', () => {
  it('Detect necessary builds with various changed file formats', async () => {
    const changedFilenames = [
      'project1',
      'project1/',
      'project1/foo.js',
      'foo/project1',
      'foo/project1/',
      'foo/project1/bar.js',
    ];

    for (const changedFilename of changedFilenames) {
      const filteredBuilds: Build[] = filterBuildsWithChangedFiles(builds, [changedFilename]);
      expect(filteredBuilds.map(build => build.id)).toEqual(['build1']);
    }
  });

  it('Detect necessary builds with multiple files and projects', async () => {
    const filteredBuilds1: Build[] = filterBuildsWithChangedFiles(builds, ['foo.js', 'project3/bar.js']);
    expect(filteredBuilds1.map(build => build.id)).toEqual(['build2']);

    const filteredBuilds2: Build[] = filterBuildsWithChangedFiles(builds, ['project2/foo.js']);
    expect(filteredBuilds2.map(build => build.id)).toEqual(['build1', 'build3']);

    const filteredBuilds3: Build[] = filterBuildsWithChangedFiles(builds, ['project1/foo.js', 'project3/foo.js']);
    expect(filteredBuilds3.map(build => build.id)).toEqual(['build1', 'build2']);

    const filteredBuilds4: Build[] = filterBuildsWithChangedFiles(builds, ['project1/foo.js', 'project4/foo.js']);
    expect(filteredBuilds4.map(build => build.id)).toEqual(['build1', 'build2', 'build3']);

    const filteredBuilds5: Build[] = filterBuildsWithChangedFiles(builds, ['project4/foo.js']);
    expect(filteredBuilds5.map(build => build.id)).toEqual(['build2', 'build3']);

    const filteredBuilds6: Build[] = filterBuildsWithChangedFiles(builds, ['foo/bar.js']);
    expect(filteredBuilds6.map(build => build.id)).toEqual([]);
  });
});
