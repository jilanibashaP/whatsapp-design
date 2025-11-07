const { response } = require('../utils/response');
const chatService = require('../services/chat.service');

exports.createChat = async (req, res, next) => {
  try {
    const { user_id, is_group, group_name, group_icon, members, other_user_id, group_description } = req.body;

    // Validate user_id is provided
    if (!user_id) {
      return res.status(400).json(
        response({ 
          error: 'user_id is required'
        }, false)
      );
    }

    let chat;
    if (is_group) {
      if (!group_name || !members || !Array.isArray(members) || members.length === 0) {
        return res.status(400).json(
          response({
            error: 'Group name and at least one member are required for group chat'
          }, false)
        );
      }
      chat = await chatService.createGroupChat(user_id, {
        name: group_name,
        icon: group_icon,
        group_description: group_description,
        members
      });
    } else {
      if (!other_user_id) {
        return res.status(400).json(
          response({
            error: 'Other user ID is required for private chat'
          }, false)
        );
      }
      chat = await chatService.createOrGetPrivateChat(user_id, other_user_id);
    }

    res.json(response({ chat }));
  } catch (error) {
    next(error);
  }
};

exports.getChats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const chats = await chatService.getUserChats(userId);
    res.json(response({ chats }));
  } catch (error) {
    next(error);
  }
};
