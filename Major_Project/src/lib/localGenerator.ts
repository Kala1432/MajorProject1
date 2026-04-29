export interface PipelineFiles {
  summary: string;
  dockerfile: string;
  dockerCompose: string;
  githubAction: string;
  jenkinsfile: string;
}

export interface RepoContext {
  owner: string;
  repo: string;
  defaultBranch: string;
  language: string | null;
  detectedFramework: string;
  detectedRuntime: string;
}

export const parseGithubRepo = (rawUrl: string) => {
  const match = rawUrl.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:$|[/?#])/i);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
};

export const generateFallbackPipeline = (rawUrl: string) => {
  const parsed = parseGithubRepo(rawUrl) || { owner: "owner", repo: "repository" };
  const { owner, repo } = parsed;
  const projectName = repo.replace(/[-_]/g, " ");

  const files: PipelineFiles = {
    summary: `This fallback pipeline generates a basic Dockerfile, docker-compose service, GitHub Actions workflow, and Jenkinsfile for ${owner}/${repo}. Review and customize it for your stack before production.`,
    dockerfile: `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]`,
    dockerCompose: `version: "3.8"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production`,
    githubAction: `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Use Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm install
      - run: npm test`,
    jenkinsfile: `pipeline {
  agent any
  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }
    stage('Install') {
      steps {
        sh 'npm install'
      }
    }
    stage('Test') {
      steps {
        sh 'npm test'
      }
    }
    stage('Deploy') {
      steps {
        echo 'Deploy step needs to be customized for your environment.'
      }
    }
  }
}`,
  };

  const context: RepoContext = {
    owner,
    repo,
    defaultBranch: "main",
    language: "JavaScript",
    detectedFramework: "Node.js",
    detectedRuntime: "Node.js",
  };

  return { files, context };
};
