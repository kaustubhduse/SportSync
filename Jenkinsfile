```groovy
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

    // Process Services stage
    stage('Process Services') {
      steps {
        script {
          // Define the reusable function at the top level of the script block
          def processService(serviceName, imageVarName) {
            stage("${serviceName} - Install Dependencies") {
              dir("${serviceName}-service") {
                sh 'npm install'
              }
            }
            stage("${serviceName} - Lint") {
              when {
                expression { fileExists("${serviceName}-service/.eslintrc.js") || fileExists("${serviceName}-service/.prettierrc") }
              }
              steps {
                dir("${serviceName}-service") {
                  sh 'npm run lint || echo "Lint not configured"'
                }
              }
            }
            stage("${serviceName} - Test") {
              steps {
                dir("${serviceName}-service") {
                  sh 'npm test || echo "No tests configured"'
                }
              }
            }
            stage("${serviceName} - Build & Push Docker Image") {
              steps {
                script {
                  def serviceTag = "${serviceName}-service:${BUILD_NUMBER}"
                  def serviceImage = "${DOCKERHUB_NAMESPACE}/${serviceTag}"
                  env[imageVarName] = serviceImage
                  dir("${serviceName}-service") {
                    sh "docker build -t ${serviceImage} ."
                    withCredentials([
                      usernamePassword(credentialsId: 'dockerhub', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS'),
                      string(credentialsId: 'dockerhub-token', variable: 'DOCKERHUB_TOKEN')
                    ]) {
                      sh """
                        # Log in to DockerHub
                        echo "\${DOCKER_PASS}" | docker login -u "\${DOCKER_USER}" --password-stdin

                        # Get list of tags for the repository
                        curl -s -H "Authorization: Bearer \${DOCKERHUB_TOKEN}" \
                          "https://hub.docker.com/v2/namespaces/${DOCKERHUB_NAMESPACE}/repositories/${serviceName}-service/tags?page_size=100" | \
                          jq -r '.results[].name' | while read tag; do
                            # Skip the current build tag
                            if [ "\${tag}" != "${BUILD_NUMBER}" ]; then
                              echo "Deleting tag \${tag} for ${serviceName}-service"
                              curl -s -X DELETE -H "Authorization: Bearer \${DOCKERHUB_TOKEN}" \
                                "https://hub.docker.com/v2/namespaces/${DOCKERHUB_NAMESPACE}/repositories/${serviceName}-service/tags/\${tag}" || \
                                echo "Failed to delete tag \${tag} (may not exist or insufficient permissions)"
                            fi
                          done

                        # Push the new image
                        docker push \${${imageVarName}}
                      """
                    }
                  }
                }
              }
            }
            stage("${serviceName} - Update Deployment & Commit") {
              steps {
                dir("argocd/${serviceName}-service") {
                  sh """
                    sed -i "s|kaustubhduse/${serviceName}-service:.*|\${${imageVarName}}|g" deployment.yaml
                    git config --global user.name "kaustubhduse"
                    git config --global user.email "202251045@iiitvadodara.ac.in"
                    git add deployment.yaml
                    git commit -m "${serviceName} Deployment updated to \${${imageVarName}}" || echo "No changes to commit"
                  """
                  withCredentials([usernamePassword(credentialsId: 'github', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_PASS')]) {
                    sh """
                      git pull origin main --rebase
                      git push https://\${GIT_USER}:\${GIT_PASS}@github.com/kaustubhduse/Sports-auction.git main
                    """
                  }
                }
              }
            }
          }

          // Process each service
          def services = [
            [name: 'auth', imageVar: 'AUTH_IMAGE_NAME'],
            [name: 'user', imageVar: 'USER_IMAGE_NAME'],
            [name: 'event', imageVar: 'EVENT_IMAGE_NAME'],
            [name: 'auction', imageVar: 'AUCTION_IMAGE_NAME'],
            [name: 'live-score', imageVar: 'LIVESCORE_IMAGE_NAME'],
            [name: 'payment', imageVar: 'PAYMENT_IMAGE_NAME']
          ]

          // Call the function for each service
          for (service in services) {
            processService(service.name, service.imageVar)
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
```

