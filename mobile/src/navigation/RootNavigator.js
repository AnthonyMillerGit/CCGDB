import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import GamesScreen from '../screens/GamesScreen'
import CardDetailScreen from '../screens/CardDetailScreen'
import CollectionScreen from '../screens/CollectionScreen'
import SearchScreen from '../screens/SearchScreen'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

function GamesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#2d3243' },
        headerTintColor: '#08D9D6',
        headerTitleStyle: { color: '#EAEAEA' },
      }}
    >
      <Stack.Screen name="Games" component={GamesScreen} />
      <Stack.Screen name="CardDetail" component={CardDetailScreen} options={{ title: 'Card' }} />
    </Stack.Navigator>
  )
}

export default function RootNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#2d3243', borderTopColor: '#363d52' },
        tabBarActiveTintColor: '#08D9D6',
        tabBarInactiveTintColor: '#8892a4',
      }}
    >
      <Tab.Screen name="Browse" component={GamesStack} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Collection" component={CollectionScreen} />
    </Tab.Navigator>
  )
}
