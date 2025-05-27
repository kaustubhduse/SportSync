pipeline {
  agent { label 'Jenkins-Agent' }

  tools {
    nodejs 'Node18'
  }

  environment {
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

    stage('Install jq'){
      steps{
        sh '''
          sudo apt update
          sudo apt install -y jq || echo "jq is already installed or installation failed"
        '''
      }
    }

    stage('Process Services') {
      steps {
        script {
          def processService = { serviceName, imageVarName ->
            // 1. Install Dependencies
            stage("${serviceName} - Install Dependencies") {
              dir("${serviceName}-service") {
                sh 'npm install'
              }
            }

            // 2. Lint
            if (fileExists("${serviceName}-service/.eslintrc.js") || fileExists("${serviceName}-service/.prettierrc")) {
              stage("${serviceName} - Lint") {
                dir("${serviceName}-service") {
                  sh 'npm run lint || echo "Lint not configured"'
                }
              }
            }

            // 3. Test
            stage("${serviceName} - Test") {
              dir("${serviceName}-service") {
                sh 'npm test || echo "No tests configured"'
              }
            }

            // 4. Build & Push Docker Image
            stage("${serviceName} - Build & Push Docker Image") {
              def serviceTag = "${serviceName}-service:${BUILD_NUMBER}"
              def serviceImage = "${DOCKERHUB_NAMESPACE}/${serviceTag}"
              env[imageVarName] = serviceImage

              dir("${serviceName}-service") {
                sh "docker build -t ${serviceImage} ."

                withCredentials([
                  usernamePassword(credentialsId: 'dockerhub', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS'),
                ]) {
                  sh """
                    echo "\${DOCKER_PASS}" | docker login -u "\${DOCKER_USER}" --password-stdin
                    auth_token=\$(curl -s -H "Content-Type: application/json" -X POST \
                     -d '{"username": "\${DOCKER_USER}", "password": "\${DOCKER_PASS}"}' \
                     https://hub.docker.com/v2/users/login/ | jq -r .token)
                    
                    curl -s -H "Authorization: JWT \${auth_token}" \
                      "https://hub.docker.com/v2/repositories/${DOCKERHUB_NAMESPACE}/${serviceName}-service/tags?page_size=100" | \
                      jq -r '.results[].name' | while read tag; do
                        if [ "\${tag}" != "${BUILD_NUMBER}" ]; then
                          echo "Deleting tag \${tag} for ${serviceName}-service"
                          curl -s -X DELETE -H "Authorization: JWT \$auth_token" \
                            "https://hub.docker.com/v2/repositories/${DOCKERHUB_NAMESPACE}/${serviceName}-service/tags/\${tag}" || \
                            echo "Failed to delete tag \${tag}"
                        fi
                      done
                    docker push ${serviceImage}
                    echo "Docker image ${serviceImage} pushed successfully"
                  """
                }
              }
            }

            // 5. Update Deployment YAML and Push
            stage("${serviceName} - Update Deployment & Commit") {
              dir("argocd/${serviceName}-service") {
                sh """
                  sed -i "s|kaustubhduse/${serviceName}-service:.*|${env[imageVarName]}|g" deployment.yaml
                  git config --global user.name "kaustubhduse"
                  git config --global user.email "202251045@iiitvadodara.ac.in"
                  git add deployment.yaml
                  git commit -m "${serviceName} Deployment updated to ${env[imageVarName]}" || echo "No changes to commit"
                """

                withCredentials([usernamePassword(credentialsId: 'github', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_PASS')]) {
                  sh """
                    git pull origin main --rebase
                    git push https://${GIT_USER}:${GIT_PASS}@github.com/kaustubhduse/Sports-auction.git main
                  """
                }
              }
            }
          }

          def services = [
            [name: 'auth', imageVar: 'AUTH_IMAGE_NAME'],
            [name: 'user', imageVar: 'USER_IMAGE_NAME'],
            [name: 'event', imageVar: 'EVENT_IMAGE_NAME'],
            [name: 'auction', imageVar: 'AUCTION_IMAGE_NAME'],
            [name: 'live-score', imageVar: 'LIVESCORE_IMAGE_NAME'],
            [name: 'payment', imageVar: 'PAYMENT_IMAGE_NAME']
          ]

          for (service in services) {
            processService(service.name, service.imageVar)
          }
        }
      }
    }

    stage('Run databases, redis, rabbitmq') {
      steps {
        script {
          def services = [
            'postgres_auth',
            'postgres_user',
            'mongo_event',
            'mongo_auction',
            'redis_auction',
            'mongo_live_score',
            'redis_live_score',
            'mongo_payment',
            'redis_payment',
            'rabbitmq'
          ]

          for (service in services) {
            sh "docker-compose -f docker-compose.yml up -d ${service} || echo 'Failed to start ${service}'"
          }
        }
      }
    }

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
