const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CorporateContact = sequelize.define('CorporateContact', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    phone_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    department: {
      type: DataTypes.STRING,
      allowNull: true
    },
    job_title: {
      type: DataTypes.STRING,
      allowNull: true
    },
    profile_pic: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'corporate_contacts',
    timestamps: false
  });

  CorporateContact.associate = (models) => {
    CorporateContact.belongsToMany(models.User, {
      through: models.UserContact,
      foreignKey: 'corporate_contact_id',
      otherKey: 'user_id',
      as: 'users'
    });
  };

  return CorporateContact;
};
