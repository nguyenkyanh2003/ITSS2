// Giả lập database (Mongoose, Sequelize, hoặc queries SQL...)
const users = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Doe', email: 'jane@example.com' }
];

const User = {
    getAll: async () => {
        // Tương tác với Database ở đây
        return users;
    },
    create: async (userData) => {
        // Tương tác với Database ở đây
        const newUser = { id: users.length + 1, ...userData };
        users.push(newUser);
        return newUser;
    }
};

module.exports = User;
