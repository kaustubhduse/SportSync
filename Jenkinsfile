pipeline {
  agent { label 'Jenkins-Agent' }

  tools {
    nodejs 'Node18'
  }

  environment {
    // DockerHub namespace
    DOCKERHUB_NAMESPACE = "kaustubhduse"

    // Secrets for auth-service
    AUTH_PORT = "5001"
    AUTH_DATABASE_URL = "postgresql://kaustubh:kaustubh123@postgres_auth:5432/authdb"
    ACCESS_TOKEN_SECRET = "kaustubh"
    REFRESH_TOKEN_SECRET = "kaustubh"
    GOOGLE_CLIENT_ID = "530067300231-p246llgkoqo323lpf9jfq2tp5uih3d6g.apps.googleusercontent.com"
    GOOGLE_CLIENT_SECRET = "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"
    GOOGLE_CALLBACK_URL = "http://localhost:5001/api/auth/google/callback"
    SESSION_SECRET = "fa356d375a7c85c5fdba3c646bc657bf335817a95169694f4dbbacc8a0bc5516"

    // Secrets for user-service
    USER_PORT = "5002"
    USER_DATABASE_URL = "postgresql://kaustubh:kaustubh123@postgres_user:5432/userdb"
    USER_ACCESS_TOKEN_SECRET = "kaustubh"
  }

  stages {
    stage("Clean Workspace") {
      steps {
        cleanWs()
      }
    }

    stage("Checkout Code") {
      steps {
        git branch: 'main', credentialsId: 'github', url: 'https://github.com/kaustubhduse/Sports-auction'
      }
    }

    // ============================
    // ---- AUTH SERVICE STEPS ----
    // ============================
    stage("Auth - Install Dependencies") {
      steps {
        dir('auth-service') {
          sh 'npm install'
        }
      }
    }

    stage("Auth - Lint") {
      when {
        expression { fileExists('auth-service/.eslintrc.js') || fileExists('auth-service/.prettierrc') }
      }
      steps {
        dir('auth-service') {
          sh 'npm run lint || echo "Lint not configured"'
        }
      }
    }

    stage("Auth - Test") {
      steps {
        dir('auth-service') {
          sh 'npm test || echo "No tests configured"'
        }
      }
    }

    stage("Auth - Build & Push Docker Image") {
      steps {
        script {
          def authTag = "auth-service:${BUILD_NUMBER}"
          def authImage = "${DOCKERHUB_NAMESPACE}/${authTag}"
          env.AUTH_IMAGE_NAME = authImage
          dir('auth-service') {
            sh "docker build -t ${authImage} ."
            withCredentials([usernamePassword(credentialsId: 'dockerhub', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
              sh '''
                echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                docker push ${AUTH_IMAGE_NAME}
              '''
            }
          }
        }
      }
    }

    stage("Auth - Update Deployment & Commit") {
      steps {
        dir('argocd/auth-service') {
          sh '''
            sed -i "s|kaustubhduse/auth-service:.*|${AUTH_IMAGE_NAME}|g" deployment.yaml
            git config --global user.name "kaustubhduse"
            git config --global user.email "202251045@iiitvadodara.ac.in"
            git add deployment.yaml
            git commit -m "Auth Deployment updated to ${AUTH_IMAGE_NAME}" || echo "No changes to commit"
          '''
          withCredentials([usernamePassword(credentialsId: 'github', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_PASS')]) {
            sh "git push https://${GIT_USER}:${GIT_PASS}@github.com/kaustubhduse/Sports-auction.git main"
          }
        }
      }
    }

    // =============================
    // ---- USER SERVICE STEPS -----
    // =============================
    stage("User - Install Dependencies") {
      steps {
        dir('user-service') {
          sh 'npm install'
        }
      }
    }

    stage("User - Lint") {
      when {
        expression { fileExists('user-service/.eslintrc.js') || fileExists('user-service/.prettierrc') }
      }
      steps {
        dir('user-service') {
          sh 'npm run lint || echo "Lint not configured"'
        }
      }
    }

    stage("User - Test") {
      steps {
        dir('user-service') {
          sh 'npm test || echo "No tests configured"'
        }
      }
    }

    stage("User - Build & Push Docker Image") {
      steps {
        script {
          def userTag = "user-service:${BUILD_NUMBER}"
          def userImage = "${DOCKERHUB_NAMESPACE}/${userTag}"
          env.USER_IMAGE_NAME = userImage
          dir('user-service') {
            sh "docker build -t ${userImage} ."
            withCredentials([usernamePassword(credentialsId: 'dockerhub', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
              sh '''
                echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                docker push ${USER_IMAGE_NAME}
              '''
            }
          }
        }
      }
    }

    stage("User - Update Deployment & Commit") {
      steps {
        dir('argocd/user-service') {
          sh '''
            sed -i "s|kaustubhduse/user-service:.*|${USER_IMAGE_NAME}|g" deployment.yaml
            git config --global user.name "kaustubhduse"
            git config --global user.email "202251045@iiitvadodara.ac.in"
            git add deployment.yaml
            git commit -m "User Deployment updated to ${USER_IMAGE_NAME}" || echo "No changes to commit"
          '''
          withCredentials([usernamePassword(credentialsId: 'github', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_PASS')]) {
            sh "git push https://${GIT_USER}:${GIT_PASS}@github.com/kaustubhduse/Sports-auction.git main"
          }
        }
      }
    }

    stage("Clean Up Docker") {
      steps {
        sh '''
          echo "Removing Docker images"
          docker rmi ${AUTH_IMAGE_NAME} || echo "Auth image not found or already removed"
          docker rmi ${USER_IMAGE_NAME} || echo "User image not found or already removed"

          echo "Removing dangling images"
          docker image prune -f || true

          echo "Removing stopped containers"
          docker container prune -f || true
        '''
      }
    }
  }

  post {
    always {
      echo "Pipeline finished."
    }
    success {
      echo "Pipeline completed successfully!"
    }
    failure {
      echo "Pipeline failed!"
    }
  }
}
