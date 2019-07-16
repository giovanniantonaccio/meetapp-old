import { isBefore } from 'date-fns';

import Registration from '../models/Registration';
import Meetup from '../models/Meetup';

class RegistrationController {
  async store(req, res) {
    const { id } = req.params;

    const meetup = await Meetup.findByPk(id);

    /**
     * Check if the meetup exist
     */
    if (!meetup) {
      return res.status(400).json({ error: 'Meetup does not exist' });
    }

    /**
     * Check if the user is the owner of the meetup
     */
    if (meetup.user_id === req.userId) {
      return res.status(401).json({
        error: 'User can`t registrate to a meetup where he is the owner',
      });
    }

    /**
     * Check if the meetup is in the past
     */
    if (isBefore(meetup.date, new Date())) {
      return res
        .status(400)
        .json({ error: 'Cannot registrate to meetups that already occured' });
    }

    /**
     * Check if the user was already registered to the meetup
     */
    const registered = await Registration.findOne({
      where: {
        meetup_id: id,
        user_id: req.userId,
      },
    });

    if (registered) {
      return res
        .status(400)
        .json({ error: 'User is already registered to this meetup' });
    }

    /**
     * Check if the user is registered to another meetup at the same time
     */
    const userEnrolled = await Registration.findOne({
      where: {
        user_id: req.userId,
      },
      attributes: ['id', 'user_id', 'meetup_id'],
      include: [
        {
          model: Meetup,
          as: 'meetup',
          attributes: ['id', 'name', 'date'],
          where: {
            date: meetup.date,
          },
        },
      ],
    });

    if (userEnrolled) {
      return res
        .status(400)
        .json({ error: 'User is enrolled to another meetup at the same time' });
    }

    const subscription = await Registration.create({
      meetup_id: id,
      user_id: req.userId,
    });

    return res.json(subscription);
  }
}

export default new RegistrationController();
