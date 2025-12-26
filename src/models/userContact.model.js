const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserContact = sequelize.define('UserContact', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    corporate_contact_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'corporate_contacts',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    added_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'user_contacts',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'corporate_contact_id']
      }
    ]
  });

  UserContact.associate = (models) => {
    UserContact.belongsTo(models.User, { 
      foreignKey: 'user_id', 
      as: 'user' 
    });
    UserContact.belongsTo(models.CorporateContact, { 
      foreignKey: 'corporate_contact_id', 
      as: 'corporateContact' 
    });
  };

  return UserContact;
};
