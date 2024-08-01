const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const http = require('http');

const app = express();
app.use(bodyParser.json());

const APEX_API_URL = 'https://apex.oracle.com/pls/apex/new_api/user_roles/user/';
const HF_API_KEY = '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';

app.post('/get-role', async (req, res) => {
    const { userEmail, message } = req.body;
    console.log(`User with email ${userEmail} is asking: ${message}`);

    // Fetch role from Oracle APEX API
    request.get(`${APEX_API_URL}${userEmail}`, async (error, response, body) => {
        if (error) {
            console.error('Error fetching role from APEX API:', error);
            return res.status(500).json({ error: 'Error fetching role from APEX API' });
        }

        let role;
        try {
            const roleData = JSON.parse(body);
            console.log('roleData:', roleData);
            if (roleData.items && roleData.items.length > 0) {
                role = roleData.items[0].r_name;
                console.log(`Role fetched for user ${userEmail}: ${role}`);
            } else {
                role = 'undefined';
            }
        } catch (jsonError) {
            console.error('Error parsing JSON from APEX API:', jsonError);
            return res.status(500).json({ error: 'Error parsing JSON from APEX API' });
        }

        // Generate response using Hugging Face's DialoGPT
        const prompt = `User with email ${userEmail} is asking: ${message}. The role is: ${role}`;

        const options = {
            hostname: 'api-inference.huggingface.co',
            path: '/models/microsoft/DialoGPT-medium',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_API_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        const req = http.request(options, (response) => {
            let data = '';

            response.on('data', (chunk) => {
                data += chunk;
            });

            response.on('end', () => {
                try {
                    const gptResponse = JSON.parse(data);
                    console.log('GPT API response:', gptResponse);

                    if (gptResponse && gptResponse.choices && gptResponse.choices.length > 0) {
                        const friendlyMessage = gptResponse.choices[0].text.trim();
                        console.log('AI Response:', friendlyMessage);
                        res.json({ response: friendlyMessage });
                    } else {
                        res.json({ response: 'Sorry, I could not generate a response.' });
                    }
                } catch (error) {
                    console.error('Error parsing GPT response:', error);
                    res.status(500).json({ error: 'Error parsing GPT response' });
                }
            });
        });

        req.on('error', (e) => {
            console.error('Error with request:', e.message);
            res.status(500).json({ error: 'Error with request to Hugging Face API' });
        });

        req.write(JSON.stringify({ inputs: prompt }));
        req.end();
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
