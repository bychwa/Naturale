var express = require('express');
var app = express();
var request = require('request');

var natural = require('natural'), classifier = new natural.BayesClassifier();
natural.PorterStemmer.attach();

var wordnet = new natural.WordNet();
var fs = require('fs');

var data = [];
var engine = {};
const clean = (word) => {
    return word.replace(/[^a-zA-Z0-9 ]/g, '');
}
const word_classify = (word, wclass) => {
    classifier.addDocument(word, wclass);
    classifier.train();
    if (engine[wclass]) {
        if (!(engine[wclass].indexOf(word) > -1)) {
            engine[wclass].push(word);
        }
    } else {
        engine[wclass] = [];
        engine[wclass].push(word);
    }
}
const word_train = (word, callback) => {
    wordnet.lookup(word, (results) => {

        results.forEach((result) => {
            if (result.synonyms && result.synonyms.length) {
                result.synonyms.forEach((syn) => {
                    word_classify(result.def, syn);
                    if (result.exp && result.exp.length) {
                        result.exp.forEach((e) => {
                            word_classify(e, syn);
                        });
                    }
                });
            } else {
                word_classify(result.def, result.lemma);
                if (result.exp && result.exp.length) {
                    result.exp.forEach((e) => {
                        word_classify(e, result.lemma);
                    });
                }
            }
        });
        return callback(null, { 'status': 'success' });
    });
}
const process_text = (text, callback) => {
    cleantext = clean(text);
    words = cleantext.tokenizeAndStem();
    if (words && words.length) {
        words.forEach((word,index)=>{
            word_train(word, (err, done) => {
                if (index + 1 >= words.length) {
                    console.log('just learnt about ' + text);
                    console.log('******* FINISHED');
                    return callback(null, done);
                }
            });
        });
    }
}
var getMovies = (genre, callback)=>{
    request('https://content.viaplay.se/pc-se/film/'+genre+'?block=1&partial=1&pageNumber=1&sort=most_popular', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var contents = JSON.parse(body);
            contents = contents._embedded['viaplay:products'] && contents._embedded['viaplay:products'].map((movie)=>{
                let actors = (movie.content.people.actors && movie.content.people.actors.reduce((prev,curr)=>{
                    prev = prev+''+curr;
                    return prev;
                },'')) || '';
                return {'genre':genre.toString(), 'id': movie.system.guid.toString(),'title':movie.content.title.toString(),'actors': actors.toString(), 'year':movie.content.production.year.toString(),'synopsis':movie.content.synopsis.toString() };
            });

            return callback(contents);
        }
    });
}
const train_on_movies = (callback) => {
    getMovies('action',(movies) => {
         movies.forEach((movie,index) => {
            for (_meta in movie){
                word_classify(movie[_meta], movie.title);
            }
            if(index +1 >= movies.length){
                return callback({'status':'success'});
            }
        });
    });
}

app.get('/', function (req, res) {
    res.json({ 'status': 'ok' });
});
app.get('/query', function (req, res) {

    const _text = req.query.text;
    const _value = req.query.value;

    const _clasify = req.query.classify;
    if (_clasify === 'true') {
        process_text(_text, (err, done) => {
            if (err) {
                res.json({ 'status': 'Error on querying the classifier!' });
            } else {
                const _value = classifier.getClassifications(_text);
                const _item = engine[_value] && engine[_value][Math.floor(Math.random() * engine[_value].length)];
                res.json({ text: _text, classified_as: _value, response_text: _item, engine: { total: Object.keys(engine).length, values: engine } });
            }
        });

    } else {
        
        const _value = classifier.classify(classifier.classify(_text));
        const _item = engine[_value] && engine[_value][Math.floor(Math.random() * engine[_value].length)];
        res.json({ text: _text, classified_as: _value, response_text: _item, engine: { total: Object.keys(engine).length, values: engine } });
    }

});
app.get('/save', function (req, res) {
    const fileName = req.query.file || './datasets/classifier.json';
    classifier.save(fileName, function (err, cls) {
        if (err) {
            res.json({ status: 'Error on saving the classifier!' });
        } else {
            console.log("Classifier successfully saved!")
            res.json({ status: 'Classifier successfully saved!' });
        }
    });
});
app.get('/load', function (req, res) {
    const fileName = req.query.file || 'classifier.json';
    natural.BayesClassifier.load(fileName, null, function (err, cls) {
        if (err) {
            res.json({ status: 'Error on loading the classifier!' });
        } else {
            classifier = cls;
            console.log("Successfully loaded and updated the classifier!");
            res.json({ status: 'Successfully loaded and updated the classifier!' });
        }
    });
});
app.get('/get', function (req, res) {
    if(req.query.text){
        if(req.query.text ==='engine'){
            res.json(engine);    
        }else{
            res.sendFile(__dirname + '/datasets/classifier.json');
        }
    }else{
        res.sendFile(__dirname + '/datasets/classifier.json');
    }

});
app.get('/movies', function (req, res) {
    const keyword = req.query.text;
    const fileName = 'https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&explaintext&exintro&titles=' + keyword + '&redirects=true';
    request({
        method: 'GET',
        uri: fileName,
    }, function (error, response, body) {
        if (error) {
            res.json({ status: 'Error on training the classifier!' });
        } else {
            const bodyValues = JSON.parse(body);
            const WikiPages = bodyValues.query.pages;
            Object.keys(WikiPages).forEach((key,index) => {
                WikiPages[key].extract.split('.').forEach((line) => {
                    process_text(line,(err,done)=>{
                        if(index + 1 >= WikiPages.length){
                            
                        }
                    });
                });
            });

            res.json({ status: 'Successfully scheduled classifier training!' });
            
        }

    })
});
app.get('/train', function (req, res) {
    const keyword = req.query.text;
    const fileName = 'https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&explaintext&exintro&titles=' + keyword + '&redirects=true';
    request({
        method: 'GET',
        uri: fileName,
    }, function (error, response, body) {
        if (error) {
            res.json({ status: 'Error on training the classifier!' });
        } else {
            const bodyValues = JSON.parse(body);
            const WikiPages = bodyValues.query.pages;
            Object.keys(WikiPages).forEach((key,index) => {
                WikiPages[key].extract.split('.').forEach((line) => {
                    process_text(line,(err,done)=>{
                        if(index + 1 >= WikiPages.length){
                            
                        }
                    });
                });
            });

            res.json({ status: 'Successfully scheduled classifier training!' });
            
        }

    })
});

app.get('/healthcheck', function (req, res) { res.json({ 'status': 'ok' }); });
app.get('/status', function (req, res) { res.json({ 'status': 'ok' }); });
app.get('/application', function (req, res) { res.json({ 'status': 'ok' }); });
app.get('/version', function (req, res) { res.json({ 'status': 'ok' }); });

app.listen(8087, function () {
    console.log('Performing initial training!')
    // initial training

    // process_text('Tanzania is a great country.', (err, done) => {
    //     process_text('I graduated from college this year.', (err, done) => {
    //         process_text('A good friend is a great companion.', (err, done) => {
    //             process_text('Is there life in Mars?', (err, done) => {
    //                 process_text('Coffee keeps me awake.', (err, done) => {
    //                     console.log('******* FINISHED ALL');

    //                     const fileName = './datasets/classifier.json';
    //                     natural.BayesClassifier.load(fileName, null, function (err, cls) {
    //                         if (err) {
    //                             console.log('******* ERROR ON UPDATING CLASSIFIER');
    //                         } else {
    //                             classifier = cls;
    //                             console.log('******* JUST UPDATED CLASSIFIER');
    //                         }
    //                     });
    //                 });
    //             });
    //         });
    //     });
    // });
    train_on_movies((done)=>{
        console.log(done);
    });

});
