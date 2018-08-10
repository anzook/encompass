Encompass.SectionListComponent = Ember.Component.extend(Encompass.CurrentUserMixin, {

  // This sorts all the sections in the database and returns only the ones you created
  yourSections: Ember.computed(function () {
    var sections = this.sections;
    var currentUser = this.get('currentUser');
    var yourSections = sections.filterBy('createdBy.content', currentUser);
    console.log('your Sections', yourSections);
    return yourSections;
  }),

  // This displays the sections if you are inside the teachers array
  // This works but by default if you create it you are in the teacher's array
  collabSections: Ember.computed(function () {
    var sections = this.sections;
    console.log('sections =', sections);
    var currentUser = this.get('currentUser');
    var collabSections = sections.filterBy('teachers');
    console.log('your collab sections =', collabSections);
    return collabSections;
  })

});