'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Submissions', 'letterGrade', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('Submissions', 'gradePoints', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Submissions', 'letterGrade');
    await queryInterface.removeColumn('Submissions', 'gradePoints');
  }
};
