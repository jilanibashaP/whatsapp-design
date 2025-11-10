const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
  name: { type: DataTypes.STRING, allowNull: true },
  phone_number: { type: DataTypes.STRING, allowNull: false, unique: true },
  profile_pic: { type: DataTypes.TEXT },
  about: { type: DataTypes.STRING },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  email: { type: DataTypes.STRING },
  // Presence tracking fields
  last_seen: { type: DataTypes.DATE, allowNull: true },
  is_online: { type: DataTypes.BOOLEAN, defaultValue: false },
  // OTP fields for verification
  otp: { type: DataTypes.STRING, allowNull: true },
  otp_expiry: { type: DataTypes.DATE, allowNull: true },
  otp_attempts: { type: DataTypes.INTEGER, defaultValue: 0 },
  is_verified: { type: DataTypes.BOOLEAN, defaultValue: false }
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
