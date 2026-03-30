## Useful commands




```
pnpm run db:seed:skip-onboarding 
```
runs the seed in db to skip the onboarding process


``` 
podman compose -f docker-compose.ngrok.yml up --build
ngrok http 3002
```
run the app via ngrok:
- web is on http://localhost:3002
- nginx proxies API and websocket traffic to the API container
- dynamic ngrok origins are allowed, so you do not need to rebuild every time the ngrok URL changes
