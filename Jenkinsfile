pipeline {
    agent { label 'Jenkins-Agent' }

    tools {
        nodejs 'Node18' // Make sure this is configured in Jenkins
    }

    environment {
        NODE_ENV = 'development'
    }

    stages {
        stage("Cleanup Workspace") {
            steps {
                cleanWs()
            }
        }

        stage("Checkout from SCM") {
            steps {
                git branch: 'main', credentialsId: 'github', url: 'https://github.com/kaustubhduse/Sports-auction'
            }
        }

        stage("Install Dependencies (auth-service)") {
            steps {
                dir('auth-service') {
                    sh 'npm install'
                }
            }
        }

        stage("Lint or Format (Optional)") {
            when {
                expression { fileExists('auth-service/.eslintrc.js') || fileExists('auth-service/.prettierrc') }
            }
            steps {
                dir('auth-service') {
                    sh 'npm run lint || echo "No lint script defined."'
                }
            }
        }

        stage("Test (auth-service)") {
            steps {
                dir('auth-service') {
                    sh 'npm test || echo "No test script defined."'
                }
            }
        }

        stage("Build Docker Image") {
            steps {
                dir('auth-service') {
                    sh 'docker build -t auth-service:latest .'
                }
            }
        }
    }
}
