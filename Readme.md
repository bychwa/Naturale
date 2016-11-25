# Naturale
This is a simple natural language classification application that basically takes a sentence or word and train the machine based on definition/meaning into a set of class that as ..{to be continued}

### Installation
#### Docker
If you have docker installed, just run the following command to build and run this application. 
```sh
$ docker-compose up --build
```
#### Npm
If you have npm already installed, just run the following command to build and install the application.
```sh
$ npm run start
```

### Usage:
To use the application, visit the site on http://localhost:80/ on any of your favorite web browser or rest client.

### Routes:
```yaml
http://localhost:80/
http://localhost:80/query?text={whateverEnglishTextYouWant}{&classify=true||false}
http://localhost:80/train?text={whateverEnglishTextYouWant}
http://localhost:80/save{?file=filename.json }
http://localhost:80/load{?file=filename.json }
http://localhost:80/get?text={classifier||engine }

http://localhost:80/healthcheck
http://localhost:80/status
http://localhost:80/application
http://localhost:80/version
```
### Example:
##### Sample Request: 
```sh
$ curl -i -H "Accept: application/json" -H "Content-Type: application/json" http://localhost:80/query=gates&classify=true
```
##### Sample Response:
```json
{
    "text": "gates", 
    "classified_as": "gate", 
    "response_text": "a computer circuit with several inputs but only one output that can be activated by particular combinations of inputs  ", 
    "engine": {} 
}
```