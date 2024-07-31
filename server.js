const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

const OPENAI_API_KEY = 'sk-proj-j7EGiJnuUDW6YhrnAKAST3BlbkFJ61cHwObLUBNO1FLiFTXJ'; // Replace with your OpenAI API key
const APEX_API_URL = 'http://apex.oracle.com/ords/WKSP_STATIC/new_api/user_roles/user/'; // Replace with your Oracle APEX RESTful Web Service URL

app.use(express.json());

function isRoleQuery(message) {
    const roleKeywords = ['role', 'my role', 'what is my role', 'role in system', 'role info'];
    return roleKeywords.some(keyword => message.toLowerCase().includes(keyword));
}

app.post('/get-role', async (req, res) => {
    const { userEmail, message } = req.body;

    if (!isRoleQuery(message)) {
        return res.json({ message: 'This chatbot only responds to queries about your role.' });
    }

    try {
        const roleResponse = await axios.get(`${APEX_API_URL}${userEmail}`);
        const userRoleData = roleResponse.data.items[0];

        if (!userRoleData) {
            return res.json({ message: 'User not found or no role assigned.' });
        }

        const roleMessage = `Email: ${userRoleData.email}\nRole: ${userRoleData.role_name}\nDescription: ${userRoleData.description}`;

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
        console.error(error);
        res.status(500).send('An error occurred while processing your request');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
