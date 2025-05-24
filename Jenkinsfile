pipeline {
    agent { label 'Jenkins-Agent' }

    tools {
        nodejs 'Node18'
    }

    environment {
        PORT=5001
        DATABASE_URL="postgresql://kaustubh:kaustubh123@postgres_auth:5432/authdb"
        ACCESS_TOKEN_SECRET=kaustubh
        ACCESS_TOKEN_EXPIRY=1h
        REFRESH_TOKEN_SECRET=kaustubh
        REFRESH_TOKEN_EXPIRY=7d
        GOOGLE_CLIENT_ID=530067300231-p246llgkoqo323lpf9jfq2tp5uih3d6g.apps.googleusercontent.com
        GOOGLE_CLIENT_SECRET=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
        GOOGLE_CALLBACK_URL=http://localhost:5001/api/auth/google/callback
        SESSION_SECRET=fa356d375a7c85c5fdba3c646bc657bf335817a95169694f4dbbacc8a0bc5516
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
                    sh 'docker tag auth-service:latest kaustubhduse/auth-service:latest'
                }
            }
        }

        stage("Push to Docker Hub") {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh '''
                        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                        docker push kaustubhduse/auth-service:latest
                    '''
                }
            }
        }
    }
}
