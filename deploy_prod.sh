docker build -f Dockerfile.prod -t gcr.io/${PROJECT_ID_}/udic-edu-server:latest -t gcr.io/${PROJECT_ID_}/udic-edu-server:$SHA .

docker push gcr.io/${PROJECT_ID_}/udic-edu-server:latest

docker push gcr.io/${PROJECT_ID_}/udic-edu-server:$SHA

kubectl apply -f k8s/udic-edu-server-deployment.yaml
kubectl apply -f k8s/udic-edu-server-cluster-ip-service.yaml
kubectl set image deployments/udic-edu-server-deployment udic-edu-server=gcr.io/${PROJECT_ID_}/udic-edu-server:$SHA
