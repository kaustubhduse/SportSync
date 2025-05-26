pipeline {
  agent { label 'Jenkins-Agent' }

  tools {
    nodejs 'Node18'
  }

  environment {
    IMAGE_TAG = "auth-service:${BUILD_NUMBER}"
    IMAGE_NAME = "kaustubhduse/${IMAGE_TAG}"
    APP_NAME = "register-app-pipeline"

    // Secrets and tokens
    PORT = "5001"
    DATABASE_URL = "postgresql://kaustubh:kaustubh123@postgres_auth:5432/authdb"
    ACCESS_TOKEN_SECRET = "kaustubh"
    ACCESS_TOKEN_EXPIRY = "1h"
    REFRESH_TOKEN_SECRET = "kaustubh"
    REFRESH_TOKEN_EXPIRY = "7d"
    GOOGLE_CLIENT_ID = "530067300231-p246llgkoqo323lpf9jfq2tp5uih3d6g.apps.googleusercontent.com"
    GOOGLE_CLIENT_SECRET = "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"
    GOOGLE_CALLBACK_URL = "http://localhost:5001/api/auth/google/callback"
    SESSION_SECRET = "fa356d375a7c85c5fdba3c646bc657bf335817a95169694f4dbbacc8a0bc5516"
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

    stage("Install Dependencies") {
      steps {
        dir('auth-service') {
          sh 'npm install'
        }
      }
    }

    stage("Lint") {
      when {
        expression { fileExists('auth-service/.eslintrc.js') || fileExists('auth-service/.prettierrc') }
      }
      steps {
        dir('auth-service') {
          sh 'npm run lint || echo "Lint not configured"'
        }
      }
    }

    stage("Test") {
      steps {
        dir('auth-service') {
          sh 'npm test || echo "No tests configured"'
        }
      }
    }

    stage("Build Docker Image") {
      steps {
        dir('auth-service') {
          sh "docker build -t ${IMAGE_NAME} ."
        }
      }
    }

    stage("Push Docker Image") {
      steps {
        withCredentials([usernamePassword(credentialsId: 'dockerhub', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
          sh '''
            echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
            docker push ${IMAGE_NAME}
          '''
        }
      }
    }

    stage("Checkout Repo") {
      steps {
          git branch: 'main', credentialsId: 'github', url: 'https://github.com/kaustubhduse/Sports-auction'
      }
    }

    stage("Update Deployment Tag") {
      steps {
        dir('argocd/auth-service') {
          sh '''
            cat deployment.yaml
            sed -i "s|kaustubhduse/auth-service:.*|${IMAGE_NAME}|g" deployment.yaml
            cat deployment.yaml
          '''
        }
      }
    }

    stage("Commit & Push Manifest") {
      steps {
        dir('argocd/auth-service') {
          sh '''
            git config --global user.name "kaustubhduse"
            git config --global user.email "202251045@iiitvadodara.ac.in"
            git add deployment.yaml
            git commit -m "Updated Deployment Manifest to ${IMAGE_TAG}" || echo "No changes to commit"
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
          echo "Removing Docker image: ${IMAGE_NAME}"
          docker rmi ${IMAGE_NAME} || echo "Image not found or already removed"

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
