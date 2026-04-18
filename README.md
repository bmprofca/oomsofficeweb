# Getting Started with OOMS App V4.0.6

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

## Password Groups Module

### UI routes

- `/staff/office-assistance/password-groups`
- `/staff/office-assistance/password-group/:group_id/firms`

### Implemented frontend API integration

- `POST /assistance/password-group/create`
- `GET /assistance/password-group/list?search=&page=&limit=`
- `PUT /assistance/password-group/edit/:group_id`
- `DELETE /assistance/password-group/delete/:group_id`
- `POST /assistance/password-group/create-firm-credentials`
- `GET /assistance/password-group/list-firm-credentials/:group_id?page_no=&limit=&search=`
- `PUT /assistance/password-group/edit-firm-credentials/:credential_id`
- `DELETE /assistance/password-group/delete-firm-credentials/:credential_id`

### Frontend structure

- Service layer: `src/services/passwordGroupService.js`
- Debounce hook: `src/hooks/useDebouncedValue.js`
- Group list page: `src/pages/office-assistance/password-group.js`
- Group credentials page: `src/components/PasswordGroupFirms.js`

### How to test quickly

1. Open Password Groups route.
2. Create a group with a non-empty trimmed name.
3. Search groups (debounced), change page/limit, and verify URL query params update.
4. Edit group name/status and confirm list refresh.
5. Delete a group (confirmation modal).
6. Open a group row to credentials page.
7. Add credential (firm + username + password required).
8. Edit credential fields/status and verify updates.
9. Delete credential (confirmation modal).
10. Verify `page_no`, `limit` (20/50/100), and `search` are sent for credentials listing.
