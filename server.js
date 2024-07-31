const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

const OPENAI_API_KEY = 'sk-proj-j7EGiJnuUDW6YhrnAKAST3BlbkFJ61cHwObLUBNO1FLiFTXJ';
const APEX_API_URL = 'https://apex.oracle.com/ords/WKSP_STATIC/new_api/user_roles/user/';

app.use(express.json());

function isRoleQuery(message) {
    if (typeof message !== 'string') {
        return false; // Return false if message is not a string
    }
    const roleKeywords = ['role', 'my role', 'what is my role', 'role in system', 'role info'];
    return roleKeywords.some(keyword => message.toLowerCase().includes(keyword));
}

app.post('/get-role', async (req, res) => {
    const { userEmail, message } = req.body;

    console.log('Received request:', req.body);

    if (!message) {
        return res.status(400).json({ message: 'Message field is required.' });
    }

    if (!isRoleQuery(message)) {
        return res.json({ message: 'This chatbot only responds to queries about your role.' });
    }

    try {
        console.log('Fetching role from APEX API');
        const roleResponse = await axios.get(`${APEX_API_URL}${userEmail}`);
        const userRoleData = roleResponse.data.items[0];

        if (!userRoleData) {
            return res.json({ message: 'User not found or no role assigned.' });
        }

        const roleMessage = `Email: ${userRoleData.email}\nRole: ${userRoleData.role_name}\nDescription: ${userRoleData.description}`;

        console.log('Fetching GPT response');
        const gptResponse = await axios.post('https://api.openai.com/v1/completions', {
            model: 'text-davinci-002',
            prompt: `Generate a friendly message for the following user role data: ${roleMessage}`,
            max_tokens: 150
        }, {
            headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` }
        });

        const friendlyMessage = gptResponse.data.choices[0].text.trim();
        res.json({ message: friendlyMessage });
    } catch (error) {
        console.error('Error occurred:', error);
        res.status(500).json({ message: 'An internal error occurred. Please try again later.' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
