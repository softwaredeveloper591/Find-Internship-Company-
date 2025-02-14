
module.exports = (sequelize, DataTypes) => {
const Conversation = sequelize.define('conversation', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    user1_email: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    user1_name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    user2_email: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    user2_name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    isDeletedByUser1: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    isDeletedByUser2: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    timestamps: true, // Enable timestamps
    updatedAt: false, // Disable updatedAt
    indexes: [
        {
            unique: true,
            fields: ['user1_email', 'user2_email']
        }
    ]
});

return Conversation;
}
