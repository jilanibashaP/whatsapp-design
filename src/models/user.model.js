const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
  name: { type: DataTypes.STRING, allowNull: false },
  phone_number: { type: DataTypes.STRING, allowNull: false, unique: true },
  // password: { type: DataTypes.STRING, allowNull: false },
  profile_pic: { type: DataTypes.TEXT },
  status: { type: DataTypes.STRING },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  email: { type: DataTypes.STRING }
  }, {
    tableName: 'users',
    timestamps: false
  });

  User.associate = (models) => {
    User.hasMany(models.Chat, { foreignKey: 'created_by' });
    User.belongsToMany(models.Chat, {
      through: models.ChatMember,
      foreignKey: 'user_id',
      otherKey: 'chat_id'
    });
    User.hasMany(models.Message, { foreignKey: 'sender_id' });
    User.hasMany(models.MessageStatus, { foreignKey: 'user_id' });
  };

  return User;
};
