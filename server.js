const express = require('express');
const https = require('https');
const app = express();
const port = process.env.PORT || 3000;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const APEX_API_BASE_URL = "https://apex.oracle.com/pls/apex/new_api/user_roles/user/";

app.use(express.json());

function isRoleQuery(message) {
    if (typeof message !== 'string') {
        return false;
    }
    const roleKeywords = ['role', 'my role', 'what is my role', 'role in system', 'role info'];
    return roleKeywords.some(keyword => message.toLowerCase().includes(keyword));
}

app.post('/get-role', (req, res) => {
    const { userEmail, message } = req.body;

    console.log('Received request:', req.body);

    if (!message) {
        return res.status(400).json({ message: 'Message field is required.' });
    }

    if (!isRoleQuery(message)) {
        return res.json({ message: 'This chatbot only responds to queries about your role.' });
    }

    console.log('Fetching role from APEX API for email:', userEmail);
    https.get(`${APEX_API_BASE_URL}${userEmail}`, (roleResponse) => {
        let data = '';

        roleResponse.on('data', (chunk) => {
            data += chunk;
        });

        roleResponse.on('end', () => {
            console.log('Role API response:', data);
            const roleData = JSON.parse(data);
            const userRoleData = roleData.items[0];

            if (!userRoleData) {
                return res.json({ message: 'User not found or no role assigned.' });
            }

            const roleMessage = `Email: ${userRoleData.email}\nRole: ${userRoleData.role_name}\nDescription: ${userRoleData.description}`;

            console.log('Fetching GPT response');
            const postData = JSON.stringify({
                model: 'text-davinci-002',
                prompt: `Generate a friendly message for the following user role data: ${roleMessage}`,
                max_tokens: 150
            });

            const options = {
                hostname: 'api.openai.com',
                path: '/v1/completions',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Length': postData.length
                }
            };

            const gptReq = https.request(options, (gptRes) => {
                let gptData = '';

                gptRes.on('data', (chunk) => {
                    gptData += chunk;
                });

                gptRes.on('end', () => {
                    const gptResponse = JSON.parse(gptData);
                    const friendlyMessage = gptResponse.choices[0].text.trim();
                    res.json({ message: friendlyMessage });
                });
            });

            gptReq.on('error', (e) => {
                console.error('Error occurred:', e);
                res.status(500).json({ message: 'An internal error occurred. Please try again later.' });
            });

            gptReq.write(postData);
            gptReq.end();
        });
    }).on('error', (e) => {
        console.error('Error occurred:', e);
        res.status(500).json({ message: 'An internal error occurred. Please try again later.' });
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
