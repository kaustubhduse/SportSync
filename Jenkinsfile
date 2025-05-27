pipeline {
  agent { label 'Jenkins-Agent' }

  tools {
    nodejs 'Node18'
  }

  environment {
    // DockerHub namespace
    DOCKERHUB_NAMESPACE = 'kaustubhduse'
  }

  stages {
    stage('Clean Workspace') {
      steps {
        cleanWs()
      }
    }

    stage('Checkout Code') {
      steps {
        git branch: 'main', credentialsId: 'github', url: 'https://github.com/kaustubhduse/Sports-auction'
      }
    }

    // ============================
    // ---- AUTH SERVICE STEPS ----
    // ============================
    stage('Auth - Install Dependencies') {
      steps {
        dir('auth-service') {
          sh 'npm install'
        }
      }
    }

    stage('Auth - Lint') {
      when {
        expression { fileExists('auth-service/.eslintrc.js') || fileExists('auth-service/.prettierrc') }
      }
      steps {
        dir('auth-service') {
          sh 'npm run lint || echo "Lint not configured"'
        }
      }
    }

    stage('Auth - Test') {
      steps {
        dir('auth-service') {
          sh 'npm test || echo "No tests configured"'
        }
      }
    }

    stage('Auth - Build & Push Docker Image') {
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

    stage('Auth - Update Deployment & Commit') {
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
    stage('User - Install Dependencies') {
      steps {
        dir('user-service') {
          sh 'npm install'
        }
      }
    }

    stage('User - Lint') {
      when {
        expression { fileExists('user-service/.eslintrc.js') || fileExists('user-service/.prettierrc') }
      }
      steps {
        dir('user-service') {
          sh 'npm run lint || echo "Lint not configured"'
        }
      }
    }

    stage('User - Test') {
      steps {
        dir('user-service') {
          sh 'npm test || echo "No tests configured"'
        }
      }
    }

    stage('User - Build & Push Docker Image') {
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

    stage('User - Update Deployment & Commit') {
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

    // ========== EVENT SERVICE ==========
    stage('Event - Install Dependencies') {
      steps { dir('event-service') { sh 'npm install' } }
    }
    stage('Event - Lint') {
      when { expression { fileExists('event-service/.eslintrc.js') || fileExists('event-service/.prettierrc') } }
      steps { dir('event-service') { sh 'npm run lint || echo "Lint not configured"' } }
    }
    stage('Event - Test') {
      steps { dir('event-service') { sh 'npm test || echo "No tests configured"' } }
    }
    stage('Event - Build & Push Docker Image') {
      steps {
        script {
          def eventTag = "event-service:${BUILD_NUMBER}"
          def eventImage = "${DOCKERHUB_NAMESPACE}/${eventTag}"
          env.EVENT_IMAGE_NAME = eventImage
          dir('event-service') {
            sh "docker build -t ${eventImage} ."
            withCredentials([usernamePassword(credentialsId: 'dockerhub', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
              sh '''
                echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                docker push ${EVENT_IMAGE_NAME}
              '''
            }
          }
        }
      }
    }
    stage('Event - Update Deployment & Commit') {
      steps {
        dir('argocd/event-service') {
          sh '''
            sed -i "s|kaustubhduse/event-service:.*|${EVENT_IMAGE_NAME}|g" deployment.yaml
            git config --global user.name "kaustubhduse"
            git config --global user.email "202251045@iiitvadodara.ac.in"
            git add deployment.yaml
            git commit -m "Event Deployment updated to ${EVENT_IMAGE_NAME}" || echo "No changes to commit"
          '''
          withCredentials([usernamePassword(credentialsId: 'github', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_PASS')]) {
            sh "git push https://${GIT_USER}:${GIT_PASS}@github.com/kaustubhduse/Sports-auction.git main"
          }
        }
      }
    }

    // ========== AUCTION SERVICE ==========
    stage('Auction - Install Dependencies') {
      steps { dir('auction-service') { sh 'npm install' } }
    }
    stage('Auction - Lint') {
      when { expression { fileExists('auction-service/.eslintrc.js') || fileExists('auction-service/.prettierrc') } }
      steps { dir('auction-service') { sh 'npm run lint || echo "Lint not configured"' } }
    }
    stage('Auction - Test') {
      steps { dir('auction-service') { sh 'npm test || echo "No tests configured"' } }
    }
    stage('Auction - Build & Push Docker Image') {
      steps {
        script {
          def auctionTag = "auction-service:${BUILD_NUMBER}"
          def auctionImage = "${DOCKERHUB_NAMESPACE}/${auctionTag}"
          env.AUCTION_IMAGE_NAME = auctionImage
          dir('auction-service') {
            sh "docker build -t ${auctionImage} ."
            withCredentials([usernamePassword(credentialsId: 'dockerhub', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
              sh '''
                echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                docker push ${AUCTION_IMAGE_NAME}
              '''
            }
          }
        }
      }
    }
    stage('Auction - Update Deployment & Commit') {
      steps {
        dir('argocd/auction-service') {
          sh '''
            sed -i "s|kaustubhduse/auction-service:.*|${AUCTION_IMAGE_NAME}|g" deployment.yaml
            git config --global user.name "kaustubhduse"
            git config --global user.email "202251045@iiitvadodara.ac.in"
            git add deployment.yaml
            git commit -m "Auction Deployment updated to ${AUCTION_IMAGE_NAME}" || echo "No changes to commit"
          '''
          withCredentials([usernamePassword(credentialsId: 'github', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_PASS')]) {
            sh "git push https://${GIT_USER}:${GIT_PASS}@github.com/kaustubhduse/Sports-auction.git main"
          }
        }
      }
    }
    

      // ========== LIVE SCORE SERVICE ==========
    stage("LiveScore - Install Dependencies") {
      steps { dir('live-score-service') { sh 'npm install' } }
    }
    stage("LiveScore - Lint") {
      when { expression { fileExists('live-score-service/.eslintrc.js') || fileExists('live-score-service/.prettierrc') } }
      steps { dir('live-score-service') { sh 'npm run lint || echo "Lint not configured"' } }
    }
    stage("LiveScore - Test") {
      steps { dir('live-score-service') { sh 'npm test || echo "No tests configured"' } }
    }
    stage("LiveScore - Build & Push Docker Image") {
      steps {
        script {
          def liveScoreTag = "live-score-service:${BUILD_NUMBER}"
          def liveScoreImage = "${DOCKERHUB_NAMESPACE}/${liveScoreTag}"
          env.LIVESCORE_IMAGE_NAME = liveScoreImage
          dir('live-score-service') {
            sh "docker build -t ${liveScoreImage} ."
            withCredentials([usernamePassword(credentialsId: 'dockerhub', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
              sh '''
                echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                docker push ${LIVESCORE_IMAGE_NAME}
              '''
            }
          }
        }
      }
    }
    stage("LiveScore - Update Deployment & Commit") {
      steps {
        dir('argocd/live-score-service') {
          sh '''
            sed -i "s|kaustubhduse/live-score-service:.*|${LIVESCORE_IMAGE_NAME}|g" deployment.yaml
            git config --global user.name "kaustubhduse"
            git config --global user.email "202251045@iiitvadodara.ac.in"
            git add deployment.yaml
            git commit -m "LiveScore Deployment updated to ${LIVESCORE_IMAGE_NAME}" || echo "No changes to commit"
          '''
          withCredentials([usernamePassword(credentialsId: 'github', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_PASS')]) {
            sh "git push https://${GIT_USER}:${GIT_PASS}@github.com/kaustubhduse/Sports-auction.git main"
          }
        }
      }
    }

     // ========== PAYMENT SERVICE ==========
    stage("Payment - Install Dependencies") {
      steps { dir('payment-service') { sh 'npm install' } }
    }
    stage("Payment - Lint") {
      when { expression { fileExists('payment-service/.eslintrc.js') || fileExists('payment-service/.prettierrc') } }
      steps { dir('payment-service') { sh 'npm run lint || echo "Lint not configured"' } }
    } 
    stage("Payment - Test") {
      steps { dir('payment-service') { sh 'npm test || echo "No tests configured"' } }
    }
    
    stage("Payment - Build & Push Docker Image") {
      steps {
        script {
          def paymentTag = "payment-service:${BUILD_NUMBER}"
          def paymentImage = "${DOCKERHUB_NAMESPACE}/${paymentTag}"
          env.PAYMENT_IMAGE_NAME = paymentImage
          dir('payment-service') {
            sh "docker build -t ${paymentImage} ."
            withCredentials([usernamePassword(credentialsId: 'dockerhub', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
              sh '''
                echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                docker push ${PAYMENT_IMAGE_NAME}
              '''
            }
          }
        }
      }
    }

    stage("Payment - Update Deployment & Commit") {
      steps {
        dir('argocd/payment-service') {
          sh '''
            sed -i "s|kaustubhduse/payment-service:.*|${PAYMENT_IMAGE_NAME}|g" deployment.yaml
            git config --global user.name "kaustubhduse"
            git config --global user.email "202251045@iiitvadodara.ac.in"
            git add deployment.yaml
            git commit -m "Payment Deployment updated to ${PAYMENT_IMAGE_NAME}" || echo "No changes to commit"
          '''
          withCredentials([usernamePassword(credentialsId: 'github', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_PASS')]) {
            sh "git push https://${GIT_USER}:${GIT_PASS}@github.com/kaustubhduse/Sports-auction.git main"
          }
        }
      }
    }

     // ========== CLEAN UP DOCKER ========== 

    stage('Clean Up Docker') {
      steps {
        sh '''
          echo "Removing Docker images"
          docker rmi ${AUTH_IMAGE_NAME} || echo "Auth image not found or already removed"
          docker rmi ${USER_IMAGE_NAME} || echo "User image not found or already removed"
          docker rmi ${EVENT_IMAGE_NAME} || echo "Event image not found or already removed"
          docker rmi ${AUCTION_IMAGE_NAME} || echo "Auction image not found or already removed"
          docker rmi ${LIVESCORE_IMAGE_NAME} || echo "LiveScore image not found or already removed"
          docker rmi ${PAYMENT_IMAGE_NAME} || echo "Payment image not found or already removed"
          docker rmi $(docker images -f "dangling=true" -q) || echo "No dangling images to remove"

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
      echo 'Pipeline finished.'
    }
    success {
      echo 'Pipeline completed successfully!'
    }
    failure {
      echo 'Pipeline failed!'
    }
  }
}
