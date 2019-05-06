export type Build = {
  id: string;
  label: string;
  manifestFile: string;
  projectPaths: string[];
};

export function filterBuildsWithChangedFiles(builds: Build[], filenames: string[]): Build[] {
  // Return the builds associated with projects that have changed files
  return builds.filter((build: Build) =>
    build.projectPaths.some((projectPath: string) => filenames.some(filename => filename.includes(projectPath)))
  );
}
