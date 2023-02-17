#!/bin/sh
# Author: Greenify VietNam (greenifyvn@gmail.com)

set +x
SHA=$(git rev-parse HEAD)
PROJECT_ID="neat-pagoda-334509"
NAME_SPACE="default"
time=$(date)

echo "*** MANUALLY DEPLOY TO GCP ***"
docker build -f Dockerfile.prod -t gcr.io/${PROJECT_ID}/udic-edu-server:latest -t gcr.io/${PROJECT_ID}/udic-edu-server:${SHA} .

docker push gcr.io/${PROJECT_ID}/udic-edu-server:latest

docker push gcr.io/${PROJECT_ID}/udic-edu-server:${SHA}

echo $PROJECT_ID

kubectl apply -f k8s/udic-edu-server-deployment.yaml -n ${NAME_SPACE}
kubectl apply -f k8s/udic-edu-server-cluster-ip-service.yaml -n ${NAME_SPACE}
kubectl set image deployments/udic-edu-server-deployment udic-edu-server=gcr.io/${PROJECT_ID}/udic-edu-server:${SHA} -n ${NAME_SPACE}

echo "Time: $time"
echo "*** End ***"
