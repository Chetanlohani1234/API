const express = require('express');
const https = require('https');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const axios = require('axios');
const port = 5000;

app.use(cors());
app.use(bodyParser.json());

// Function to make a POST request to retrieve the token
function getToken(username, password, callback) {
    const data = JSON.stringify({
        username: username,
        password: password
    });

    const options = {
        hostname: 'llm.mindmillers.com',
        port: 443,
        path: '/gw/api/token/',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    const req = https.request(options, (res) => {
        let body = '';

        res.on('data', (chunk) => {
            body += chunk;
        });

        res.on('end', () => {
            try {
                const response = JSON.parse(body);
                if (response.access) {
                    callback(response.access);
                } else {
                    console.error('Access token not found in the response:', response);
                    callback(null);
                }
            } catch (error) {
                console.error('Error parsing response:', error);
                callback(null);
            }
        });
    });

    req.on('error', (error) => {
        console.error('Error retrieving token:', error);
        callback(null);
    });

    req.write(data);
    req.end();
}

// Function to make a POST request to another API with the token
function getChat(token, user_id, prompt, callback) {
    const data = JSON.stringify({
        user_id: user_id,
        prompt: prompt
    });

    const options = {
        hostname: 'llm.mindmillers.com',
        port: 443,
        path: '/gw/api/llm/',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    const req = https.request(options, (res) => {
        let body = '';

        res.on('data', (chunk) => {
            body += chunk;
        });

        res.on('end', () => {
            try {
                const jsonData = JSON.parse(body);
                callback(jsonData);
            } catch (error) {
                console.error('Error parsing JSON:', error);
                callback(null);
            }
        });
    });

    req.on('error', (error) => {
        console.error('Error making API request:', error);
        callback(null);
    });

    req.write(data);
    req.end();
}

app.post('/get-token', (req, res) => {
    const { username, password } = req.body;
    getToken(username, password, (token) => {
        if (!token) {
            res.status(500).send('Failed to retrieve token');
            return;
        }
        res.json({ token });
    });
});

// POST endpoint to make request to another API with the token
 app.post('/get-chat', (req, res) => {
    const { token, user_id, prompt } = req.body;
    getChat(token, user_id, prompt, (response) => {
        if (!response) {
            res.status(500).send('Failed to make API request');
            return;
        }
        res.json({response});
    });
});

app.post('/generate', async (req, res) => {
    const { model, prompt, stream } = req.body;

    console.log('Received Data:', { model, prompt, stream });

    try {
        const apiResponse = await axios({
            method: 'post',
            url: 'http://103.61.103.107:11434/api/generate',
            data: { model, prompt, stream },
            responseType: 'stream'
        });

        apiResponse.data.on('data', (chunk) => {
            try {
                // Convert the chunk to a string and parse it as JSON
                const parsedChunk = JSON.parse(chunk.toString());

                // Reformat the JSON object with indentation
                const formattedJson = JSON.stringify(parsedChunk, null, 4);

                // Log the formatted JSON for debugging
                console.log('Formatted JSON:', formattedJson);

                // Send the formatted JSON chunk to the client
                res.write(formattedJson + '\n');
            } catch (error) {
                console.error('Error parsing or formatting chunk:', error.message);
            }
        });

        apiResponse.data.on('end', () => {
            console.log('Streaming complete.');
            res.end(); // Close the connection when the stream ends
        });

    } catch (error) {
        console.error('Error calling external API:', error.message);
        res.status(500).json({ message: 'Error calling external API', error: error.message });
    }
});




//const API_KEY = 'febc8f8ac083f5fc27e032c81e7b536a';

// app.get('/', (req, res) => {
//     const URL = "https://wagonon.com/api/v1/get-live-stock/2";

//         //Set up request options including API key in headers
//         const options = {
//             headers: {
//                 'Authorization': `Bearer ${API_KEY}`
//             }
//         };

//     https.get(URL,function(response){
//        //console.log(response.statusCode);
//        response.on("data",(data)=>{
         
//           const carData = JSON.parse(data)
//            console.log(carData);
//        })
//     })
//     res.send('Hello World!')
// })

app.listen(port, () => console.log(`Example app listening on port ${port}!`))


